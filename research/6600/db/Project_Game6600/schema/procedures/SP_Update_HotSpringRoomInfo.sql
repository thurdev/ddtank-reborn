-- SQL_STORED_PROCEDURE dbo.SP_Update_HotSpringRoomInfo (modified 2015-01-25T14:04:48.233)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_HotSpringRoomInfo]
@RoomID int,
@RoomName nvarchar(50),
@Pwd nvarchar(15),
@AvailTime int,
@BreakTime datetime,
@roomIntroduction nvarchar(300)

AS

update [HotSpringRoom] set 
AvailTime = @AvailTime,
BreakTime=@BreakTime,
roomIntroduction=@roomIntroduction,
[RoomName]=@RoomName,
Pwd=@Pwd
where [RoomID] = @RoomID

GO
