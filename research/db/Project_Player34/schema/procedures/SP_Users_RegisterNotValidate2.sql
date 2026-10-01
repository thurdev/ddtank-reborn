-- SQL_STORED_PROCEDURE dbo.SP_Users_RegisterNotValidate2 (modified 2021-06-04T05:18:36.400)

-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：注册用户形象，新版>
--    bagtype; place
--arm   0;6
--hair  0;2
--face  0;5
--cloth 0;4
--hat   0;0
-- =============================================
CREATE    Procedure [dbo].[SP_Users_RegisterNotValidate2]

@UserName Nvarchar(200),
@PassWord Nvarchar(200),
@NickName Nvarchar(50),

@BArmID Int,
@BHairID Int,
@BFaceID Int,
@BClothID Int,
@BHatID Int,
@ArmPic Nvarchar(50),
@HairPic Nvarchar(50),
@FacePic Nvarchar(50),
@ClothPic Nvarchar(50),
@HatPic Nvarchar(50),
@GArmID Int,
@GHairID Int,
@GFaceID Int,
@GClothID Int,
@GHatID Int,
@ArmColor Nvarchar(50),
@HairColor Nvarchar(50),
@FaceColor Nvarchar(50),
@ClothColor Nvarchar(50),
@HatColor Nvarchar(50),
@Sex Int,
@StyleDate Int,
@CategoryID Int,
@Attack Int,
@Defence Int,
@Agility Int,
@Luck Int
as

  --第一步：定义变量
  Declare @ArmID Int    --武器
  Declare @HairID Int   --头发
  Declare @FaceID Int   --眼睛
  Declare @ClothID Int  --衣服
  Declare @HatID Int  --Hat
  Declare @isFirst Int
  Declare @UserID Int
  Declare @tempSex Int 
  Declare @style Nvarchar(1000)
  Declare @color Nvarchar(1000)
  Declare @nickIsExist Int
  --第二步：查找用户昵称是否注册
  Select @nickIsExist= isnull(count(*),0) From Sys_Users_Detail Where NickName = @NickName
  
  If @nickIsExist <> 0
  Begin
    Return 2
  End
  
  If @Sex=-1
     Begin
       Select @isFirst = IsFirst,@UserID=[UserID],@Sex=Sex From Sys_Users_Detail Where UserName =@UserName     
     End
  Else
     Begin
       Select @isFirst = IsFirst,@UserID=[UserID] From Sys_Users_Detail Where UserName =@UserName 
     End

  If isnull(@isFirst,1)>0
     Return 3

  --第三步：设置形象
  If @Sex<>0
     Begin
       Set @ArmID = @BArmID
       Set @HairID = @BHairID
       Set @FaceID = @BFaceID
       Set @ClothID = @BClothID
       Set @HatID = @BHatID
       Set @tempSex = 1
     End
  Else
     Begin
       Set @ArmID = @GArmID
       Set @HairID = @GHairID
       Set @FaceID = @GFaceID
       Set @ClothID = @GClothID
       Set @HatID = @GHatID
       Set @tempSex = 2
     End

  Set @style =  ',,' + cast(@HairID as Nvarchar(20))  + '|' + cast(@HairPic as Nvarchar(20))  + ',,' + cast(@ClothID as Nvarchar(20))  + '|' + cast(@ClothPic as Nvarchar(20))  + ',' + cast(@FaceID as Nvarchar(20))  + '|' + cast(@FacePic as Nvarchar(20))  +  ',' + cast(@ArmID as Nvarchar(20)) + '|' + cast(@ArmPic as Nvarchar(20))+ ',,,,'
  
  Set @color = ',,' + @HairColor + ',,' + @ClothColor + ',' + @FaceColor + ',' + @ArmColor + ',,,,'

  --第四步：设置相关物品属性
  Declare @TemplateID Int
  Declare @Count Int 
  Declare @ValidDate Int 
  Declare @StrengthenLevel Int 
  Declare @AttackCompose Int 
  Declare @DefEndCompose Int 
  Declare @LuckCompose Int 
  Declare @AgilityCompose Int 
  Declare @IsBinds bit 
  Declare @BagType Int 
  Declare @MaxCount Int 

  Set xact_abort on
  Begin tran
    
   --Select * From #Bag
   Declare @Index Int
   Declare @bag0 Int
   Declare @bag1 Int
   Declare @bag2 Int
   Declare @CurrentPlace Int
   Declare @getCount Int
   Set @Index = 1
   Set @bag0=31
   Set @bag1=0
   Set @bag2=0  
  
    If isnull(@CategoryID,0)=0
       Begin       
         rollback tran
         Return @@error
       End
    If(@ArmID<>0)   
       Begin
         Insert Into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefEndCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate,IsUsed)
                Values(@UserID,0,@ArmID,6,1,1,@ArmColor,1,0,0,0,0,0,1,getdate(),@StyleDate,1)
         Insert Into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefEndCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate,IsUsed)
                Values(@UserID,1,11001,0,5,1,'',1,0,0,0,0,0,1,getdate(),@StyleDate,1)
       End
    If(@HairID<>0)   
        Begin
         Insert Into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefEndCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate,IsUsed)
                Values(@UserID,0,@HairID,2,1,1,@HairColor,1,0,0,0,0,0,1,getdate(),@StyleDate,1)
        End 
	 If(@FaceID <>0)   
        Begin
         Insert Into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefEndCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate,IsUsed)
                Values(@UserID,0,@FaceID,5,1,1,@FaceColor,1,0,0,0,0,0,1,getdate(),@StyleDate,1)
        End  
	  If(@ClothID<>0)   
        Begin
         Insert Into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefEndCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate,IsUsed)
                Values(@UserID,0,@ClothID,4,1,1,@ClothColor,1,0,0,0,0,0,1,getdate(),@StyleDate,1)
        End  
	  If(@HatID<>0)   
        Begin
         Insert Into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefEndCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate,IsUsed)
                Values(@UserID,0,@HatID,0,1,1,@HatColor,1,0,0,0,0,0,1,getdate(),@StyleDate,1)
        End
    If @@error<>0
       Begin
          Rollback tran
          Return @@error
       End

    Update Sys_Users_Detail Set NickName = @NickName,IsFirst = 1,Style=@style,Colors=@color,Sex=@Sex  Where UserID = @UserID
    If @@error<>0
       Begin
         Rollback tran
         Return @@error
       End
    Update Sys_Users_Fight Set Attack =@Attack,Defence=@Defence,Agility=@Agility,Luck=@Luck  Where UserID = @UserID
    If @@error<>0
       Begin
         Rollback tran
         Return @@error
       End
    Commit tran 
    Set xact_abort off
    Return 0




GO
