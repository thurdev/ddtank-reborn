-- SQL_STORED_PROCEDURE dbo.SP_Users_Marry (modified 2015-01-25T14:04:48.370)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新用户结婚信息>
-- =============================================
CREATE Procedure [dbo].[SP_Users_Marry]
@UserID int,
@IsMarried bit,
@SpouseID int,
@SpouseName nvarchar(50),
@IsCreatedMarryRoom bit,
@SelfMarryRoomID int,
@IsGotRing bit

as

  update Sys_Users_Detail set IsMarried =@IsMarried,SpouseID=@SpouseID,SpouseName=@SpouseName,IsCreatedMarryRoom=@IsCreatedMarryRoom,
   SelfMarryRoomID=@SelfMarryRoomID,IsGotRing=@IsGotRing where UserID = @UserID

GO
