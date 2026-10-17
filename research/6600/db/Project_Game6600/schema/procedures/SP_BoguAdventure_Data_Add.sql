-- SQL_STORED_PROCEDURE dbo.SP_BoguAdventure_Data_Add (modified 2015-02-07T15:59:44.593)

CREATE  PROCEDURE [dbo].[SP_BoguAdventure_Data_Add]
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
   @ID int output,
   @lastEnterGame datetime
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].BoguAdventure_Data WHERE UserID = @UserID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[BoguAdventure_Data]
         (UserID
         ,currentIndex
         ,hp
         ,isAcquireAward1
         ,isAcquireAward2
         ,isAcquireAward3
         ,openCount
         ,isFreeReset
         ,resetCount
         ,cellInfo
         ,awardCount
         ,lastEnterGame)
    VALUES
         (@UserID
         ,@currentIndex
         ,@hp
         ,@isAcquireAward1
         ,@isAcquireAward2
         ,@isAcquireAward3
         ,@openCount
         ,@isFreeReset
         ,@resetCount
         ,@cellInfo
         ,@awardCount
         ,@lastEnterGame)
     select @@identity as 'identity'
     set @ID=@@identity      
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
