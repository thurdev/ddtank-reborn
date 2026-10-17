-- SQL_STORED_PROCEDURE dbo.SP_UserPetUseSkill_Update (modified 2015-01-25T14:04:48.160)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UserPetUseSkill_Update]   
	@PetID int ,
	@UserID int,
	@PetKill int ,
	@Place int ,
	@IsExit int ,
	@KillIndex int,
	@IsEquip bit 
AS  
declare @count int

select @count = isnull(count(*),0) from [dbo].[Sys_Users_Kill_Pet] where [PetID] = @PetID and [KillIndex] = @KillIndex --and [IsEquip] = 1

if (@count <> 0)
begin
UPDATE [dbo].[Sys_Users_Kill_Pet]
   SET [PetID] = @PetID
      ,[UserID] = @UserID
      ,[PetKill] = @PetKill
      ,[Place] = @Place
      ,[IsExit] = @IsExit
      ,[KillIndex] = @KillIndex
	  ,[IsEquip] = @IsEquip
 WHERE [PetID] = @PetID and [KillIndex] = @KillIndex --and [IsEquip] = 1 
return 1 
 end 
else 
begin
INSERT INTO [dbo].[Sys_Users_Kill_Pet]
           ([PetID]
           ,[UserID]
           ,[PetKill]
           ,[Place]
           ,[IsExit]
           ,[KillIndex]
           ,[IsEquip])
     VALUES
           (@PetID
           ,@UserID
           ,@PetKill
           ,@Place
           ,@IsExit
           ,@KillIndex
           ,@IsEquip)
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end

GO
