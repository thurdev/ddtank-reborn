-- SQL_STORED_PROCEDURE dbo.SP_Sys_Eat_Pets_All (modified 2015-03-25T21:55:14.603)

CREATE  PROCEDURE [dbo].[SP_Sys_Eat_Pets_All]
	@ID int
    AS
         BEGIN
            SELECT * FROM Sys_Eat_Pets WHERE UserID = @ID
         END

GO
