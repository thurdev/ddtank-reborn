-- SQL_STORED_PROCEDURE dbo.SP_Cloud_Buy_Log_Add (modified 2015-03-05T15:21:10.653)

CREATE  PROCEDURE [dbo].[SP_Cloud_Buy_Log_Add]
   @ID int,
   @UserID int,
   @nickName nvarchar (150),
   @templateId int,
   @validate int,
   @count int,
   @property nvarchar (150)
AS
DECLARE @tempCount int
SELECT @tempCount=COUNT(*) FROM [dbo].Cloud_Buy_Log WHERE ID = @ID
IF @tempCount >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Cloud_Buy_Log]
         (UserID
         ,nickName
         ,templateId
         ,validate
         ,count
         ,property)
    VALUES
         (@UserID
         ,@nickName
         ,@templateId
         ,@validate
         ,@count
         ,@property)
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
