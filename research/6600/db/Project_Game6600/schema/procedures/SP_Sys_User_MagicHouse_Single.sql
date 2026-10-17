-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_MagicHouse_Single (modified 2015-01-25T14:04:48.187)
CREATE  PROCEDURE [dbo].[SP_Sys_User_MagicHouse_Single]
	@UserID int
    AS
         BEGIN
            SELECT * FROM Sys_User_MagicHouse  WHERE UserID = @UserID
         END

GO
