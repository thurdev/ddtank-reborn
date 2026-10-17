-- SQL_STORED_PROCEDURE dbo.SP_RemoveSkill (modified 2015-01-25T14:04:48.157)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_RemoveSkill]   
	@PetID int ,
	@UserID int,
	@PetKill int ,
	@Place int ,
	@IsExit bit ,
	@KillIndex int, 
	@IsEquip bit
AS  

UPDATE [dbo].[Sys_Users_Kill_Pet]
   SET [PetID] = @PetID
      ,[UserID] = @UserID
      ,[PetKill] = @PetKill
      ,[Place] = @Place
      ,[IsExit] = @IsExit
      ,[KillIndex] = @KillIndex
      ,[IsEquip] = @IsEquip
 WHERE [PetID] = @PetID  and [UserID] = @UserID
 return 1 
 
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end

GO
