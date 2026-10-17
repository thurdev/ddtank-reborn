-- SQL_STORED_PROCEDURE dbo.SP_Sys_Users_Rank_Date (modified 2015-01-25T14:04:48.177)
CREATE  PROCEDURE [dbo].[SP_Sys_Users_Rank_Date]
	@UserID int
    AS
         BEGIN
            SELECT * FROM Sys_Users_Rank_Date WHERE UserID =@UserID
         END

GO
