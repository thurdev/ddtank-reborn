-- SQL_STORED_PROCEDURE dbo.SP_BoguAdventure_Data_Update (modified 2015-02-07T15:59:44.603)

CREATE  PROCEDURE [dbo].[SP_BoguAdventure_Data_Update]
   @UserID int,
   @currentIndex int,
   @hp int,
   @isAcquireAward1 int,
   @isAcquireAward2 int,
   @isAcquireAward3 int,
   @openCount int,
   @isFreeReset bit,
   @resetCount int,
   @cellInfo nvarchar (MAX),
   @awardCount nvarchar (1500),
   @ID int,
   @lastEnterGame datetime
AS
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[BoguAdventure_Data]
   SET [UserID] = @UserID
      ,[currentIndex] = @currentIndex
      ,[hp] = @hp
      ,[isAcquireAward1] = @isAcquireAward1
      ,[isAcquireAward2] = @isAcquireAward2
      ,[isAcquireAward3] = @isAcquireAward3
      ,[openCount] = @openCount
      ,[isFreeReset] = @isFreeReset
      ,[resetCount] = @resetCount
      ,[cellInfo] = @cellInfo
      ,[awardCount] = @awardCount
      ,[lastEnterGame] = @lastEnterGame
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
