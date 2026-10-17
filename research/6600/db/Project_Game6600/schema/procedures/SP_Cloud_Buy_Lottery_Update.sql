-- SQL_STORED_PROCEDURE dbo.SP_Cloud_Buy_Lottery_Update (modified 2015-03-05T14:22:50.420)

CREATE  PROCEDURE [dbo].[SP_Cloud_Buy_Lottery_Update]
   @ID int,
   @templateId int,
   @templatedIdCount int,
   @validDate int,
   @property nvarchar (150),
   @buyItemsArr nvarchar (150),
   @buyMoney int,
   @maxNum int,
   @currentNum int
AS
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Cloud_Buy_Lottery]
   SET [templateId] = @templateId
      ,[templatedIdCount] = @templatedIdCount
      ,[validDate] = @validDate
      ,[property] = @property
      ,[buyItemsArr] = @buyItemsArr
      ,[buyMoney] = @buyMoney
      ,[maxNum] = @maxNum
      ,[currentNum] = @currentNum
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
