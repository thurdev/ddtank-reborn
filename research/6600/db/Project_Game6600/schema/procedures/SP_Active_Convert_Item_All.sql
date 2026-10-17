-- SQL_STORED_PROCEDURE dbo.SP_Active_Convert_Item_All (modified 2015-01-25T14:04:48.410)
CREATE  PROCEDURE [dbo].[SP_Active_Convert_Item_All]
    AS
         BEGIN
            SELECT * FROM Active_Convert_Item --WHERE IsExist=1
         END

GO
