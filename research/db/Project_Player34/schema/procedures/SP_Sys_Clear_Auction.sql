-- SQL_STORED_PROCEDURE dbo.SP_Sys_Clear_Auction (modified 2021-06-04T05:18:35.717)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<过期信息：清除拍卖行删除记录>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Clear_Auction]
as
delete Auction where IsExist=0










GO
