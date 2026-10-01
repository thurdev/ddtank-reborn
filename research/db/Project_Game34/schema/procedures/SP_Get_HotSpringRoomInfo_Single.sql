-- SQL_STORED_PROCEDURE dbo.SP_Get_HotSpringRoomInfo_Single (modified 2021-06-04T01:29:18.047)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信处:读取一条结婚房间信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_HotSpringRoomInfo_Single]  
@RoomID int
AS
begin
    select * from [HotSpringRoom] where [RoomID]=@RoomID --and IsExist = 1 
end









GO
