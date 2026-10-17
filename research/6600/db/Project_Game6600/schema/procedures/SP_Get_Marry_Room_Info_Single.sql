-- SQL_STORED_PROCEDURE dbo.SP_Get_Marry_Room_Info_Single (modified 2015-01-25T14:04:48.633)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信处:读取一条结婚房间信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_Marry_Room_Info_Single]  
@ID int
AS
begin
    select * from Marry_Room_Info where ID=@ID and IsExist = 1 
end

GO
