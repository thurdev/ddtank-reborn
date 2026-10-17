-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_Pet_Form_All (modified 2015-01-25T14:04:48.183)
CREATE  PROCEDURE [dbo].[SP_Sys_User_Pet_Form_All]
	@UserID int
    AS
         BEGIN
            SELECT * FROM Sys_User_Pet_Form WHERE UserID = @UserID
         END

GO
