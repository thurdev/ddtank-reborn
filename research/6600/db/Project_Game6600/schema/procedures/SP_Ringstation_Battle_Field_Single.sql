-- SQL_STORED_PROCEDURE dbo.SP_Ringstation_Battle_Field_Single (modified 2015-01-25T14:04:48.693)
CREATE  PROCEDURE [dbo].[SP_Ringstation_Battle_Field_Single]
	@UserID int
    AS
         BEGIN
            SELECT * FROM Ringstation_Battle_Field WHERE UserID = @UserID
         END

GO
