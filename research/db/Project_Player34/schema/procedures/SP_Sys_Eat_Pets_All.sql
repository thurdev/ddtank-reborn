-- SQL_STORED_PROCEDURE dbo.SP_Sys_Eat_Pets_All (modified 2021-06-04T05:18:35.757)

CREATE  PROCEDURE [dbo].[SP_Sys_Eat_Pets_All]
	@ID int
    AS
         BEGIN
            SELECT * FROM Sys_Eat_Pets WHERE UserID = @ID
         END

GO
