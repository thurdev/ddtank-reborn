-- SQL_STORED_PROCEDURE dbo.SP_MountData_Update (modified 2015-01-25T14:04:48.667)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_MountData_Update] 
			@ID int
           ,@UserID int
           ,@curUseHorse int
           ,@curLevel int
           ,@curExp int
           ,@curHasSkill nvarchar(1024)
           ,@horsePicCherish nvarchar(1024)
           
 AS    
   begin 
UPDATE [dbo].[Mount_Data]
   SET [UserID] = @UserID
      ,[curUseHorse] = @curUseHorse
      ,[curLevel] = @curLevel
      ,[curExp] = @curExp
      ,[curHasSkill] = @curHasSkill
      ,[horsePicCherish] = @horsePicCherish
     WHERE [ID] = @ID
   return 0
           end
if(@@error <> 0)
begin
  return 1 ---Return false insert error
end

GO
