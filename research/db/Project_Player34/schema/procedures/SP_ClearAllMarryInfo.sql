-- SQL_STORED_PROCEDURE dbo.SP_ClearAllMarryInfo (modified 2021-06-04T05:18:34.823)




-- =============================================
-- Author:		<Eric>
-- ALTER  date: <2009-10-22>
-- Description:	<清除结婚信息：已废>
-- =============================================
CREATE PROCEDURE [dbo].[SP_ClearAllMarryInfo] AS
delete Marry_Room_Info
delete Marry_Info
update sys_users_detail set IsCreatedMarryRoom = 0,SpouseID=0,SpouseName='',IsMarried=0,MarryInfoID=0,SelfMarryRoomID=0,IsGotRing=0








GO
