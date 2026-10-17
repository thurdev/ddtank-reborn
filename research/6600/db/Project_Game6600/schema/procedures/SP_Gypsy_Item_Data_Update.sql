-- SQL_STORED_PROCEDURE dbo.SP_Gypsy_Item_Data_Update (modified 2015-04-05T16:52:56.857)

CREATE  PROCEDURE [dbo].[SP_Gypsy_Item_Data_Update]
   @ID int,
   @UserID int,
   @GypsyID int,
   @InfoID int,
   @Unit int,
   @Num int,
   @Price int,
   @CanBuy int
AS
SET XACT_ABORT ON
BEGIN TRAN
UPDATE [dbo].[Gypsy_Item_Data]
   SET [GypsyID] = @GypsyID
      ,[InfoID] = @InfoID
      ,[Unit] = @Unit
      ,[Num] = @Num
      ,[Price] = @Price
      ,[CanBuy] = @CanBuy
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
