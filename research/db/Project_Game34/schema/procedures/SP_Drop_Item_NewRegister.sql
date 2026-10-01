-- SQL_STORED_PROCEDURE dbo.SP_Drop_Item_NewRegister (modified 2021-06-04T01:29:17.930)




-- =============================================
-- Author:		<Andy>
-- ALTER  date: <2010-02-25>
-- Description:	<显示掉落物品表:掉落物品表>
-- =============================================
Create  PROCEDURE [dbo].[SP_Drop_Item_NewRegister]
AS  
 Select b.* From Drop_Condiction a  left join  Drop_Item b  On a.DropID=b.DropId
        Where a.CondictionType=10   order by b.DropId desc







GO
