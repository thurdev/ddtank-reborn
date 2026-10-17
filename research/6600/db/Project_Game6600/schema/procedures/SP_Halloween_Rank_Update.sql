-- SQL_STORED_PROCEDURE dbo.SP_Halloween_Rank_Update (modified 2015-02-17T13:53:46.933)

CREATE  PROCEDURE [dbo].[SP_Halloween_Rank_Update]
   @UserID int,
   @useNum int,
   @nickName nvarchar (150),
   @isVip int,
   @rank int
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Halloween_Rank WHERE UserID = @UserID
SET XACT_ABORT ON
BEGIN TRAN
IF @count >0
BEGIN
    UPDATE [dbo].[Halloween_Rank]
    SET [useNum] = @useNum
      ,[nickName] = @nickName
      ,[isVip] = @isVip
      ,[rank] = @rank
	WHERE UserID = @UserID
END
ELSE
  BEGIN
	INSERT INTO [dbo].[Halloween_Rank]
         ([UserID]
         ,[useNum]
         ,[nickName]
         ,[isVip]
         ,[rank])
    VALUES
         (@UserID
         ,@useNum
         ,@nickName
         ,@isVip
         ,@rank)
  END
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
