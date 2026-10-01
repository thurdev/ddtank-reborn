-- SQL_STORED_PROCEDURE dbo.SP_Sys_Clear_State (modified 2021-06-04T05:18:35.740)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<过期信息：清除服务器信息>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Clear_State]
as
update Server_List set state=1,Online=0
update Sys_Users_Detail set state=0












GO
