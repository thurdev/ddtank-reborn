-- SQL_STORED_PROCEDURE dbo.SP_Get_Marry_Room_Info (modified 2021-06-04T05:18:35.353)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信息:加载将要进行的结婚房间>
-- =============================================

CREATE PROCEDURE [dbo].[SP_Get_Marry_Room_Info]  AS
begin
    select * from Marry_Room_Info where IsExist = 1 
end








GO
