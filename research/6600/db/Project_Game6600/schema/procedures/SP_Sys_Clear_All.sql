-- SQL_STORED_PROCEDURE dbo.SP_Sys_Clear_All (modified 2015-01-25T14:04:48.830)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<过期信息：清楚已删除数据>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Clear_All]
as

exec SP_Sys_Clear_Messages

exec SP_Sys_Clear_Friends

exec SP_Sys_Clear_Items

exec SP_Sys_Clear_Auction

exec SP_Sys_Clear_Consortia

exec SP_Consortia_Scan ''

exec SP_Auction_Scan ''

exec SP_Mail_Scan ''

exec SP_Sys_Clear_State

exec Sp_Sys_DataBaseSet

exec Sp_Sys_QuestData

GO
