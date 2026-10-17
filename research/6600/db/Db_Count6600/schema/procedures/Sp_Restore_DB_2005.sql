-- SQL_STORED_PROCEDURE dbo.Sp_Restore_DB_2005 (modified 2012-04-21T07:53:24.997)








CREATE proc [dbo].[Sp_Restore_DB_2005]    /**//*恢复数据库*/
@flag varchar(20) out,    /**//*过程运行的状态标志,是输入参数*/      
@restore_db_name nvarchar(128),  /**//*要恢复的数据名字*/
@filename nvarchar(260)         /**//*备份文件存放的路径+备份文件名字*/
as
declare @proc_result tinyint  /**//*返回系统存储过程xp_cmdshell运行结果*/
declare @loop_time smallint  /**//*循环次数*/
declare @max_ids smallint    /**//*@tem表的ids列最大数*/
declare @file_bak_path nvarchar(260)  /**//*原数据库存放路径*/
declare @flag_file bit   /**//*文件存放标志*/
declare @master_path nvarchar(260)  /**//*数据库master文件路径*/
declare @sql nvarchar(4000),@par nvarchar(1000)
declare @sql_sub nvarchar(4000)
declare @sql_cmd nvarchar(4000) 
/**//*
判断参数@filename文件格式合法性，以防止用户输入类似d: 或者 c:\a\ 等非法文件名
参数@filename里面必须有'\'并且不以'\'结尾
*/



/*清除当前数据库连接*/
DECLARE    @s varchar(8000);
SET @s = '';
SELECT    @s = @s + ';KILL ' + RTRIM(spid) FROM
   ( SELECT DISTINCT  spid    FROM master.dbo.sysprocesses
            WHERE spid > 50
                  AND dbid = DB_ID(@restore_db_name)
   )A;
EXEC(@s);





if right(@filename,1)<>'\' and charindex('\',@filename)<>0
begin 
 select @sql_cmd='dir '+@filename
 EXEC @proc_result = master..xp_cmdshell @sql_cmd,no_output
 IF (@proc_result<>0)  /**//*系统存储过程xp_cmdshell返回代码值:0(成功）或1（失败）*/
 begin
  select @flag='not exist'   /**//*备份文件不存在*/
  return  /**//*退出过程*/
 end
 /**//*创建临时表,保存由备份集内包含的数据库和日志文件列表组成的结果集*/
 create table #tem(
     LogicalName nvarchar(128), /**//*文件的逻辑名称*/
     PhysicalName nvarchar(260) , /**//*文件的物理名称或操作系统名称*/
     Type char(1),  /**//*数据文件 (D) 或日志文件 (L)*/
     FileGroupName nvarchar(128), /**//*包含文件的文件组名称*/
     [Size] numeric(20,0),  /**//*当前大小（以字节为单位）*/
     [MaxSize] numeric(20,0),  /**//*允许的最大大小（以字节为单位）*/
     FileId bigint,
     CreateLSN numeric(25,0),
     DropLSN numeric(25,0),
     UniqueId  uniqueidentifier,
     ReadOnlyLSN numeric(25,0),
     ReadWriteLSN numeric(25,0),
     BackupSizeInBytes bigint,
     SourceBlockSize int,
     FileGroupId int  ,
     LogGroupGUID uniqueidentifier,
     DifferentialBaseLSN numeric(25,0),
     DifferentialBaseGUID uniqueidentifier,
     IsReadOnly bit,
     IsPresent bit
   )
 /**//*
 创建表变量，表结构与临时表基本一样
 就是多了两列,
 列ids（自增编号列）,
 列file_path,存放文件的路径
 */
 declare @tem table(       
     ids smallint identity,  /**//*自增编号列*/
     LogicalName nvarchar(128), 
     PhysicalName nvarchar(260), 
     File_path nvarchar(260), 
     Type char(1),  
     FileGroupName nvarchar(128)
   )



 insert into #tem 
  execute('restore filelistonly from disk='''+@filename+'''')


 /**//*将临时表导入表变量中,并且计算出相应得路径*/
 insert into @tem(LogicalName,PhysicalName,File_path,Type,FileGroupName)  
  select LogicalName,PhysicalName,dbo.fn_GetFilePath(PhysicalName),Type,FileGroupName 
   from #tem
 if @@rowcount>0 
 begin
  drop table #tem
 end
 select @loop_time=1
 select @max_ids=max(ids)  /**//*@tem表的ids列最大数*/
  from @tem
 while @loop_time<=@max_ids
 begin
  select @file_bak_path=file_path 
   from @tem where ids=@loop_time
  select @sql_cmd='dir '+@file_bak_path
  EXEC @proc_result = master..xp_cmdshell @sql_cmd,no_output
  /**//*系统存储过程xp_cmdshell返回代码值:0(成功）或1（失败）*/
  IF (@proc_result<>0) 
   select @loop_time=@loop_time+1  
  else
   BREAK /**//*没有找到备份前数据文件原有存放路径，退出循环*/
 end
 select @master_path=''
 if @loop_time>@max_ids 
  select @flag_file=1   /**//*备份前数据文件原有存放路径存在*/
 else
 begin
  select @flag_file=0  /**//*备份前数据文件原有存放路径不存在*/
  select @master_path=dbo.fn_GetFilePath(filename)
   from master..sysdatabases where name='Db_Membership'  --存放路径在Db_Membership一样的路径
 end

 select @sql_sub=''
 /**//*type='d'是数据文件,type='l'是日志文件 */
 /**//*@flag_file=1时新的数据库文件还是存放在原来路径，否则存放路径和Db_Membership数据库路径一样*/
 select @sql_sub=@sql_sub+'move '''+LogicalName+''' to '''
   +case type 
         when 'd' then case @flag_file 
             when 1 then  File_path 
      else @master_path 
          end    
         when 'l' then case  @flag_file
      when 1 then  File_path 
      else @master_path 
          end    
   end
   +case type
    when 'd' then @restore_db_name+'_'+LogicalName+'_data.mdf'','  
    when 'l' then @restore_db_name+'_'+LogicalName+'_log.ldf'','  
    end
   from @tem
 select @sql='RESTORE DATABASE @db_name FROM DISK=@filename with '
 select @sql=@sql+@sql_sub+'replace'
 select @par='@db_name nvarchar(128),@filename nvarchar(260)'
 print @sql
 execute sp_executesql @sql,@par,@db_name=@restore_db_name,@filename=@filename
 select @flag='ok'   /**//*操作成功*/
end
else
begin
 SELECT @flag='file type error'  /**//*参数@filename输入格式错误*/
end







GO
