-- SQL_STORED_PROCEDURE dbo.SP_Suit_Template_All (modified 2015-01-25T14:04:48.673)
CREATE  PROCEDURE [dbo].[SP_Suit_Template_All]
    AS
         BEGIN
            SELECT * FROM Suit_Template --WHERE IsExist=1
         END

GO
