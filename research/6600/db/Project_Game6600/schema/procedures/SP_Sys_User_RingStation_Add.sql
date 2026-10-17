-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_RingStation_Add (modified 2015-01-25T14:04:48.183)
CREATE  PROCEDURE [dbo].[SP_Sys_User_RingStation_Add]
   @ID int output,
   @UserID int,
   @Rank int,
   @WeaponID int,
   @signMsg nvarchar (250),
   @ChallengeNum int,
   @buyCount int,
   @Total int,
   @ChallengeTime datetime,
   @LastDate datetime,
   @BaseDamage int,
   @BaseGuard int,
   @BaseEnergy int
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Sys_User_RingStation WHERE UserID = @UserID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Sys_User_RingStation]
         (UserID
         ,[Rank]
         ,WeaponID
         ,signMsg
         ,ChallengeNum
         ,buyCount
         ,Total
         ,ChallengeTime
         ,LastDate
         ,BaseDamage
         ,BaseGuard
         ,BaseEnergy)
    VALUES
         (@UserID
         ,@Rank
         ,@WeaponID
         ,@signMsg
         ,@ChallengeNum
         ,@buyCount
         ,@Total
         ,@ChallengeTime
         ,@LastDate
         ,@BaseDamage
         ,@BaseGuard
         ,@BaseEnergy)
    select @@identity as 'identity'
    set @ID=@@identity    
	if(@@error <> 0)
	begin
	  return 1
	end
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
