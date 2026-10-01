-- SQL_STORED_PROCEDURE dbo.SP_Active_Convert_Item_All (modified 2022-01-26T06:08:48.543)

CREATE  PROCEDURE [dbo].[SP_Active_Convert_Item_All]
    AS
         BEGIN
            SELECT * FROM Active_Convert_Item --WHERE IsExist=1
         END

GO
