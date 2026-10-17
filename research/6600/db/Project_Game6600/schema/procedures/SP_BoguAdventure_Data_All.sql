-- SQL_STORED_PROCEDURE dbo.SP_BoguAdventure_Data_All (modified 2015-02-07T15:59:44.580)

CREATE  PROCEDURE [dbo].[SP_BoguAdventure_Data_All]
	@UserID int
    AS
         BEGIN
            SELECT * FROM BoguAdventure_Data WHERE UserID = @UserID
         END

GO
