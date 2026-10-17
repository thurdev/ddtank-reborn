-- SQL_STORED_PROCEDURE dbo.SP_Ringstation_Config_Update (modified 2015-01-25T14:04:48.690)
CREATE  PROCEDURE [dbo].[SP_Ringstation_Config_Update]
   @ID int,
   @ChallengeNum int,
   @buyCount int,
   @buyPrice int,
   @cdPrice int,
   @AwardTime datetime,
   @AwardNum int,
   @AwardFightWin nvarchar (550),
   @AwardFightLost nvarchar (550),
   @ChampionText nvarchar (550),
   @IsFirstUpdateRank bit
AS
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Ringstation_Config]
   SET [ChallengeNum] = @ChallengeNum
      ,[buyCount] = @buyCount
      ,[buyPrice] = @buyPrice
      ,[cdPrice] = @cdPrice
      ,[AwardTime] = @AwardTime
      ,[AwardNum] = @AwardNum
      ,[AwardFightWin] = @AwardFightWin
      ,[AwardFightLost] = @AwardFightLost
      ,[ChampionText] = @ChampionText
      ,[IsFirstUpdateRank] = @IsFirstUpdateRank
WHERE ID = @ID
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
