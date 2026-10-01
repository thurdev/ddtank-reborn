-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Task_Info_All (modified 2021-08-15T03:27:44.150)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<防沉迷：身份信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Consortia_Task_Info_All] 
AS
    begin
	select * from Consortia_Task_Info where IsExist = 1
    end








GO
