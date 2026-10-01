-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Server_Config (modified 2021-06-04T01:29:18.230)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Server_Config]	
           @ID int
           ,@Name nvarchar(50)
           ,@Value nvarchar(2000)           
           ,@setUpdate int
           
AS
declare @count2 int

select @count2 = isnull(count(*),0) from [dbo].[Server_Config] where [ID] = @ID
if (@count2 <> 0 and @setUpdate = 0)
begin

UPDATE [dbo].[Server_Config]
   SET [ID] = @ID
      ,[Name] = @Name
      ,[Value] = @Value
 WHERE [ID] = @ID
 
return 1 
 end
else 
begin

INSERT INTO [dbo].[Server_Config]
           ([ID]
           ,[Name]
           ,[Value])
     VALUES
           (@ID
           ,@Name
           ,@Value)
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
