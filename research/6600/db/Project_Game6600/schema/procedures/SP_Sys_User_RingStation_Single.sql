-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_RingStation_Single (modified 2015-01-25T14:04:48.180)
CREATE  PROCEDURE [dbo].[SP_Sys_User_RingStation_Single]
	@UserID int
    AS
         BEGIN
            SELECT * FROM Sys_User_RingStation WHERE UserID = @UserID
         END

GO
