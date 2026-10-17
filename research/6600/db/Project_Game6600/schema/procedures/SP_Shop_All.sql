-- SQL_STORED_PROCEDURE dbo.SP_Shop_All (modified 2015-01-25T14:04:48.680)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<商店信息：商店全部商品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Shop_All]
AS  
 select *  from Shop order by sort desc

GO
