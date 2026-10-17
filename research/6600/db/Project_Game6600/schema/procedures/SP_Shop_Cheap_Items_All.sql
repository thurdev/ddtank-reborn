-- SQL_STORED_PROCEDURE dbo.SP_Shop_Cheap_Items_All (modified 2015-03-26T17:09:44.577)

CREATE  PROCEDURE [dbo].[SP_Shop_Cheap_Items_All]
    AS
         BEGIN
            SELECT * FROM Shop_Cheap_Items
         END

GO
