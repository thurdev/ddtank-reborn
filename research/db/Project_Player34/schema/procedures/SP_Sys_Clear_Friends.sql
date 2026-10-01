-- SQL_STORED_PROCEDURE dbo.SP_Sys_Clear_Friends (modified 2021-06-04T05:18:35.727)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<过期信息：清除好友删除记录>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Clear_Friends]
as
delete Sys_Users_Friends where IsExist=0









GO
