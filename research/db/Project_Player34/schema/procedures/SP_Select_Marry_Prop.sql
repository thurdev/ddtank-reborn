-- SQL_STORED_PROCEDURE dbo.SP_Select_Marry_Prop (modified 2021-06-04T05:18:35.663)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信息：查询用户结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Select_Marry_Prop]
@UserID int
AS
begin
  select IsMarried,SpouseID,SpouseName,MarryInfoID,IsCreatedMarryRoom,SelfMarryRoomID,IsGotRing  from sys_users_detail where UserID=@UserID
end








GO
