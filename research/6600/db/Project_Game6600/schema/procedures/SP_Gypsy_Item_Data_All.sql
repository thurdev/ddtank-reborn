-- SQL_STORED_PROCEDURE dbo.SP_Gypsy_Item_Data_All (modified 2015-04-05T16:52:56.830)

CREATE  PROCEDURE [dbo].[SP_Gypsy_Item_Data_All]
		@ID [int]
    AS
         BEGIN
            SELECT * FROM Gypsy_Item_Data WHERE [UserID] = @ID
         END

GO
