-- SQL_STORED_PROCEDURE dbo.SP_Gypsy_Item_Data_Add (modified 2015-04-05T16:52:56.847)

CREATE  PROCEDURE [dbo].[SP_Gypsy_Item_Data_Add]
   @ID int OUTPUT,
   @UserID int,
   @GypsyID int,
   @InfoID int,
   @Unit int,
   @Num int,
   @Price int,
   @CanBuy int
AS
DECLARE @count int
SELECT @count=COUNT(*) FROM [dbo].Gypsy_Item_Data WHERE ID = @ID
IF @count >0
BEGIN
    RETURN 1
END
SET XACT_ABORT ON
BEGIN TRAN
INSERT INTO [dbo].[Gypsy_Item_Data]
         (UserID
         ,GypsyID
         ,InfoID
         ,Unit
         ,Num
         ,Price
         ,CanBuy)
    VALUES
         (@UserID
         ,@GypsyID
         ,@InfoID
         ,@Unit
         ,@Num
         ,@Price
         ,@CanBuy)
    SELECT @@IDENTITY AS 'IDENTITY'
    SET @ID=@@IDENTITY
IF @@ERROR <> 0
BEGIN
    ROLLBACK TRAN
    RETURN @@ERROR
END
COMMIT TRAN
SET XACT_ABORT OFF
RETURN 0

GO
