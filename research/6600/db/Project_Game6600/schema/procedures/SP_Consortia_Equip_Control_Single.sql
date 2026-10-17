-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Equip_Control_Single (modified 2015-01-25T14:04:48.497)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：显示一条公会相关(铁匠铺、商城)等级财富信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Equip_Control_Single]
 @ConsortiaID int, 
 @Level int,
 @Type int

AS  


select * from Consortia_Equip_Control where ConsortiaID=@ConsortiaID and [Level]=@Level and Type=@Type

GO
