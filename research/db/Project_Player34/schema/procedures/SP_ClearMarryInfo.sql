-- SQL_STORED_PROCEDURE dbo.SP_ClearMarryInfo (modified 2021-06-04T05:18:34.833)




-- =============================================
-- Author:		<Eric>
-- ALTER  date: <2009-10-22>
-- Description:	<清除结婚信息：已废>
-- =============================================
CREATE PROCEDURE [dbo].[SP_ClearMarryInfo] 
@name nvarchar(50)
AS
delete Marry_Room_Info where GroomName=@name or BrideName=@name
update sys_users_detail set IsCreatedMarryRoom = 0,SpouseID=0,SpouseName='',IsMarried=0,SelfMarryRoomID=0,IsGotRing=0 where nickname=@name








GO
