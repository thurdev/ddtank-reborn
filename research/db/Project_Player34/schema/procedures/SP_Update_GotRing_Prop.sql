-- SQL_STORED_PROCEDURE dbo.SP_Update_GotRing_Prop (modified 2021-06-04T05:18:35.840)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<婚姻：获取结婚戒指>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_GotRing_Prop]
@GroomID int,
@BrideID int
AS

update sys_users_detail set IsGotRing=1 where UserID=@GroomID or UserID=@BrideID
return 0








GO
