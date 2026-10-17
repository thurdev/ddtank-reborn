-- SQL_STORED_PROCEDURE dbo.SP_Ringstation_Config_Add (modified 2015-01-25T14:04:48.693)
CREATE  PROCEDURE [dbo].[SP_Ringstation_Config_Add]
   @ID int output,
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
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Ringstation_Config WHERE ID = @ID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Ringstation_Config]
         (ChallengeNum
         ,buyCount
         ,buyPrice
         ,cdPrice
         ,AwardTime
         ,AwardNum
         ,AwardFightWin
         ,AwardFightLost
         ,ChampionText
         ,IsFirstUpdateRank)
    VALUES
         (@ChallengeNum
         ,@buyCount
         ,@buyPrice
         ,@cdPrice
         ,@AwardTime
         ,@AwardNum
         ,@AwardFightWin
         ,@AwardFightLost
         ,@ChampionText
         ,@IsFirstUpdateRank)
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
