-- SQL_STORED_PROCEDURE dbo.SP_Sys_Clear_Consortia (modified 2021-06-04T05:18:35.720)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<过期信息：清除公会删除记录>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Clear_Consortia]
as
delete Consortia_Apply_Users where IsExist=0
delete Consortia_Invite_Users where IsExist=0
delete Consortia_Ally where IsExist=0 or state=0
delete Consortia_Duty where IsExist=0
delete Consortia where IsExist=0
delete Consortia_Event where IsExist=0
delete Consortia_Users where IsExist=0
delete Consortia_Apply_Ally where IsExist=0

delete Consortia_Equip_Control where IsExist=0








GO
