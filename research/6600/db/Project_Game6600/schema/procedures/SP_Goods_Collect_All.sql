-- SQL_STORED_PROCEDURE dbo.SP_Goods_Collect_All (modified 2015-01-25T14:04:48.610)
CREATE  PROCEDURE [dbo].[SP_Goods_Collect_All]
    AS
         BEGIN
            SELECT * FROM Goods_Collect
         END

GO
