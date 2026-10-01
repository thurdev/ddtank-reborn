-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Map_Server (modified 2021-06-04T01:29:18.173)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Map_Server] 
		   @ServerID int,
           @OpenMap nvarchar(MAX),
           @IsSpecial int,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from dbo.Map_Server where [ServerID] = @ServerID
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Map_Server]
   SET [ServerID] = @ServerID
      ,[OpenMap] = @OpenMap
      ,[IsSpecial] = @IsSpecial
	WHERE [ServerID] = @ServerID
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[Map_Server]
           ([ServerID]
           ,[OpenMap]
           ,[IsSpecial])
     VALUES
           (@ServerID,
           @OpenMap,
           @IsSpecial)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
