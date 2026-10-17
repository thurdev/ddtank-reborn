-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_RingStation_Update (modified 2015-01-25T14:04:48.180)
CREATE  PROCEDURE [dbo].[SP_Sys_User_RingStation_Update]
   @ID int,
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
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Sys_User_RingStation]
   SET [Rank] = @Rank
      ,[WeaponID] = @WeaponID
      ,[signMsg] = @signMsg
      ,[ChallengeNum] = @ChallengeNum
      ,[buyCount] = @buyCount
      ,[Total] = @Total
      ,[ChallengeTime] = @ChallengeTime
      ,[LastDate] = @LastDate
      ,[BaseDamage] = @BaseDamage
      ,[BaseGuard] = @BaseGuard
      ,[BaseEnergy] = @BaseEnergy
WHERE UserID = @UserID
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
