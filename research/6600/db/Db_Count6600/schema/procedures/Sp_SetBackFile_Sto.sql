-- SQL_STORED_PROCEDURE dbo.Sp_SetBackFile_Sto (modified 2012-04-21T07:53:24.670)

--描述：设置对备份文件操作Op包括删除、还原
CREATE   PROC  Sp_SetBackFile_Sto 
@Path Varchar(800),
@Op Varchar(20),
@ouototal varchar(50)='' output 
AS
Set @Path=Replace(@Path,'\\','\')
DECLARE @flag varchar(10)
Declare @PathAll Varchar(200)
Declare @sql_cmd Varchar(200)

if @Op='Restore'
   Begin
     Set  @PathAll=@Path
     EXEC [Sp_restore_db] @flag OUTPUT ,'Db_Tank_Copy', @PathAll
     set @ouototal='ok'
   End
if @Op='Delete'
   Begin
     Select @sql_cmd='del '+@Path  
     EXEC @ouototal=master..xp_cmdshell @sql_cmd,no_output --查找文件是否存在
   End


GO
