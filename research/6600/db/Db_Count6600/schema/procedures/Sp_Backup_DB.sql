-- SQL_STORED_PROCEDURE dbo.Sp_Backup_DB (modified 2009-04-25T09:20:11.743)
/**//*备份数据库*/
create proc SP_Backup_DB
@flag varchar(10) out,
@backup_db_name varchar(128),
@filename varchar(1000)  --路径＋文件名字
as
declare @sql nvarchar(4000),@par nvarchar(1000)
select @par='@filename varchar(1000)'
select @sql='BACKUP DATABASE '+@backup_db_name+' to disk=@filename with init'
execute sp_executesql @sql,@par,@filename
select @flag='ok'


GO
