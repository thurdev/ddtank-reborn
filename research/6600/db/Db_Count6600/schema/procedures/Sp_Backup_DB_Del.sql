-- SQL_STORED_PROCEDURE dbo.Sp_Backup_DB_Del (modified 2009-08-06T16:38:24.350)

/**//*删除当前20天备份数据库*/
CREATE proc [dbo].[Sp_Backup_DB_Del]
@backup_db_name varchar(128),
@FilePath varchar(1000)  --路径
as

/*第一步：找到删除过期文件*/
Declare @delfile varchar(1000)
Declare @countday int                                    --删除多久以前的数据
Declare @sql_cmd varchar(1000)
Declare @proc_result tinyint
set @countday=20                                         --删除20天前的数据  
Set @delfile=@FilePath+'\'+@backup_db_name+Cast(Day(DateAdd(Day,-@countday,getdate())) As Varchar(20))+'.bak'       --定义文件名
select @sql_cmd='dir '+@delfile                     
EXEC @proc_result=master..xp_cmdshell @sql_cmd,no_output --查找文件是否存在
IF (@proc_result<>0)                                     --系统存储过程xp_cmdshell返回代码值:0(成功）或1（失败）
 begin
  print @delfile
  print 'not exist'                                      --备份文件不存在
  return                                                 --退出过程
 end

/*第二步：删除过期文件*/
select @sql_cmd='del '+@delfile  
EXEC @proc_result=master..xp_cmdshell @sql_cmd,no_output --查找文件是否存在

 


GO
