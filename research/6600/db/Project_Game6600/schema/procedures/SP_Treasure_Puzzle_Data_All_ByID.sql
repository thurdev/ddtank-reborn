-- SQL_STORED_PROCEDURE dbo.SP_Treasure_Puzzle_Data_All_ByID (modified 2015-02-03T12:49:23.670)

CREATE  PROCEDURE [dbo].[SP_Treasure_Puzzle_Data_All_ByID]
	@UserID int
    AS
         BEGIN
            SELECT * FROM Treasure_Puzzle_Data WHERE UserID = @UserID
         END

GO
