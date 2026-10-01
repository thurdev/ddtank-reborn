-- SQL_STORED_PROCEDURE dbo.SP_Sys_Truncate_UserAllInfo (modified 2021-06-04T05:18:35.770)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<过期信息：开服清除所有数据>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Truncate_UserAllInfo]
as
truncate table Sys_Users_Detail
truncate table Sys_Users_Fight
truncate table Sys_Users_Goods
truncate table User_Messages
truncate table QuestData
truncate table Sys_Users_Friends
truncate table Charge_Money
truncate table User_Buff

truncate table Auction
truncate table AASInfo
 

truncate table Consortia_Apply_Users
truncate table Consortia_Invite_Users
truncate table Consortia_Ally
truncate table Consortia_Duty
truncate table Consortia
truncate table Consortia_Event
truncate table Consortia_Users
truncate table Consortia_Apply_Ally
truncate table Consortia_Equip_Control

truncate table Marry_Apply
truncate table Marry_Info
truncate table Marry_Room_Info
truncate table Fight_Record

truncate table Rename_Consortia
truncate table Rename_Nick
truncate table Sys_Users_Order
truncate table Sys_Users_Password
truncate table User_Buff

--设置数据库属性
exec Sp_Sys_DataBaseSet








GO
